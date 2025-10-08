// Verify October 2025 calendar to understand the user's expectation

console.log('=== OCTOBER 2025 CALENDAR VERIFICATION ===')
console.log('')

// Generate October 2025 calendar
const year = 2025
const month = 9 // October (0-indexed)

console.log('OCTOBER 2025')
console.log('Sun Mon Tue Wed Thu Fri Sat')

const firstDay = new Date(year, month, 1).getDay()
const daysInMonth = new Date(year, month + 1, 0).getDate()

let calendar = ''
let dayCount = 1

// Add spaces for the first week
for (let i = 0; i < firstDay; i++) {
  calendar += '    '
}

// Add all days of the month
for (let day = 1; day <= daysInMonth; day++) {
  const date = new Date(year, month, day)
  const dayOfWeek = date.getDay()
  
  // Format day with leading space if needed
  const dayStr = day.toString().padStart(3, ' ')
  
  // Highlight the range 13-29
  if (day >= 13 && day <= 29) {
    if (dayOfWeek === 0) { // Sunday
      calendar += `[${dayStr.trim()}]` // Brackets for Sundays in range
    } else {
      calendar += `(${dayStr.trim()})` // Parentheses for business days in range
    }
  } else {
    calendar += dayStr
  }
  
  // Add space after each day except Saturday
  if (dayOfWeek < 6) {
    calendar += ' '
  }
  
  // New line after Saturday
  if (dayOfWeek === 6) {
    calendar += '\n'
  }
}

console.log(calendar)
console.log('')
console.log('Legend:')
console.log('(day) = Business day in selected range (13-29)')
console.log('[day] = Sunday in selected range (excluded from count)')
console.log('')

// Count the days in the range
console.log('=== DETAILED COUNT FOR OCTOBER 13-29, 2025 ===')
let businessDays = 0
let sundays = 0
let saturdays = 0

for (let day = 13; day <= 29; day++) {
  const date = new Date(2025, 9, day) // October 2025
  const dayOfWeek = date.getDay()
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]
  
  console.log(`Oct ${day}: ${dayName}`)
  
  if (dayOfWeek === 0) {
    sundays++
    console.log('  -> SUNDAY (excluded)')
  } else if (dayOfWeek === 6) {
    saturdays++
    businessDays++
    console.log('  -> Saturday (included in current logic)')
  } else {
    businessDays++
    console.log('  -> Business day (included)')
  }
}

console.log('')
console.log('=== SUMMARY ===')
console.log(`Total days in range: ${29 - 13 + 1}`)
console.log(`Sundays (excluded): ${sundays}`)
console.log(`Saturdays (included): ${saturdays}`)
console.log(`Monday-Friday: ${businessDays - saturdays}`)
console.log(`Business days (excluding Sundays): ${businessDays}`)
console.log('')

console.log('=== POSSIBLE USER EXPECTATIONS ===')
console.log('1. If user expects 15 days but system shows 14:')
console.log('   - Maybe they\'re counting differently?')
console.log('   - Maybe they expect to include one more day?')
console.log('   - Maybe there\'s a UI display issue?')
console.log('')
console.log('2. Current system logic:')
console.log('   - Excludes only Sundays')
console.log('   - Includes Saturdays as work days')
console.log('   - Oct 13-29 = 14 business days (correct)')
console.log('')
console.log('3. If user wants 15 days from Oct 13:')
console.log('   - They would need to select until Oct 30')
console.log('   - Or there might be an off-by-one error somewhere')