export const currency = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 2,
})

export function formatDate(value: string) {
  const date = new Date(`${value.replace(' ', 'T')}Z`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function standardizeName(value: string) {
  return value.trim().toLocaleLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, boundary: string, letter: string) =>
    `${boundary}${letter.toLocaleUpperCase()}`)
}
