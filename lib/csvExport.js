/**
 * Exporte un tableau de données en fichier CSV (UTF-8 avec BOM, délimiteur ;)
 * Compatible Excel français (accents, sauts de ligne, points-virgules).
 *
 * @param {object} options
 * @param {object[]} options.data        — lignes à exporter
 * @param {string}  options.filename     — nom du fichier téléchargé
 * @param {{key:string, label:string, format?:(any)=>string}[]} options.columns
 *        - key    : clé dans l'objet data
 *        - label  : en-tête de colonne
 *        - format : fonction optionnelle de mise en forme (ex. formatCurrency)
 */
export function exportToCSV({ data, filename, columns }) {
  const BOM = '﻿'

  const escapeField = (value) => {
    const str = String(value ?? '')
    if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"'
    }
    return str
  }

  const header = columns.map((c) => escapeField(c.label)).join(';')

  const rows = data.map((item) =>
    columns
      .map((c) => {
        const value = item[c.key]
        const formatted = c.format ? c.format(value) : value
        return escapeField(formatted)
      })
      .join(';'),
  )

  const csv = BOM + header + '\n' + rows.join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.csv') ? filename : filename + '.csv'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
