# Debug Session: auth-refresh-loop
- **Status**: [OPEN]
- **Issue**: Al ingresar a `/administracion/solicitudes/permisos` se dispara `POST /auth/v1/token?grant_type=refresh_token` y Supabase responde `429 Too Many Requests`.
- **Debug Server**: Pending startup
- **Log File**: `.dbg/trae-debug-log-auth-refresh-loop.ndjson`

## Reproduction Steps
1. Iniciar sesion con un usuario administrador.
2. Entrar al dashboard de administracion.
3. Navegar a `/administracion/solicitudes/permisos`.
4. Observar en consola y network el `429` en `refresh_token`.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | La pagina dispara varias lecturas de sesion en paralelo al montar. | High | Low | Confirmed |
| B | Un componente compartido del layout consulta la sesion al entrar a esa ruta. | Med | Low | Confirmed |
| C | Las queries a `permisos_aprobaciones` entran sin sesion cargada y fuerzan refresh. | High | Med | Confirmed |
| D | `onAuthStateChange` o HMR duplica inicializaciones del cliente y del flujo auth. | Med | Med | Rejected |
| E | Un error 400 de datos en la ruta provoca reintentos que acaban en refresh cascada. | Med | Med | Rejected |

## Log Evidence
- `lib/supabase.ts:auth.getSession` registra decenas de llamadas con stack de `NotificationsDropdown`, `useOnlineUsers`, `RealtimeClient.setAuth` y `PostgrestFilterBuilder.then`.
- `components/auth/auth-provider.tsx:init` resuelve `hasSession: false` durante el repro instrumentado.
- El layout de administracion seguia renderizando hijos incluso cuando `userId === null`, permitiendo que `OnlineUsersIndicator` y `NotificationsDropdown` montaran sin sesion.
- `useOnlineUsers` creaba canal realtime sin verificar `userId/accessToken`, lo que dispara `RealtimeClient.setAuth -> getSession`.
- El usuario reporto `HEAD .../comentarios_permisos` y `No hay sesión activa` en paralelo al `429`, consistente con componentes globales montando antes de auth estable.

## Verification Conclusion
- Se aplico un fix de minimizacion de llamadas a sesion:
  1. `AuthProvider` ahora expone `accessToken`.
  2. `NotificationsDropdown` y `useOnlineUsers` dejaron de usar `auth.getSession()` en cada operacion.
  3. `useOnlineUsers` ya no abre realtime sin `userId/accessToken`.
  4. Los layouts de `administracion` y `perfil` ya no renderizan contenido protegido si `userId` es `null`.
- Pendiente verificacion del usuario con logs `post-fix`.

## Latest Iteration
- Se mantuvo la instrumentacion activa y se reinicio el Debug Server con logs limpios.
- Nuevo fix aplicado en `lib/supabase.ts`:
  1. Normaliza `session.expires_at` a partir del `exp` real del JWT.
  2. Reescribe la sesion saneada en `localStorage` para que `auth-js` no la rehidrate como expirada.
  3. Sincroniza `realtime.setAuth(access_token)` manualmente al actualizar la sesion cacheada.
  4. Devuelve `auth.getUser()` desde la sesion cacheada cuando no se pasa JWT explicito, evitando otro camino interno que podia disparar refresh.
- Objetivo de esta iteracion:
  - Confirmar si el `429 refresh_token` al entrar a `/administracion/solicitudes/permisos` provenia de un `expires_at` incoherente y/o de Realtime usando un token no fijado manualmente.
