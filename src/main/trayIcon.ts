import { nativeImage } from 'electron'

/** White 16pt menu-bar icon, with a native Retina representation and no blur. */
export function createTrayIcon() {
  const icon = nativeImage.createEmpty()
  icon.addRepresentation({ scaleFactor: 1, buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAhElEQVR4nK2T0Q3AIAhEHYFRHMFRuhGjOIIjdBRHoH7cx9lWEwMm9wMvJyAmM0se7ZIyVCA5MchDzb6nIbc1uAD3IaUKFDED82uQAdyLkgU540oYaLhl2S9yHexkIHDWF1whNlWwwgYFwUJgpQFWik9smIG7BfcQQ57RvUghqxzymY70AOT+O+57gAA7AAAAAElFTkSuQmCC', 'base64') })
  icon.addRepresentation({ scaleFactor: 2, buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABH0lEQVR4nO1X2w2DMAxkhI7ACB2BURghI2QTj5BRGIUR3ERKJWMcxymPtFJPuh9kn892EGFAxKEnuxb/aQNTpIv0mS4/u9RAKgBYB7SYsQQ9IoOhMEfIuYcMPCNXQXzJnb5XAPkZx5o1PjIgFU+FRiVnxP2aVBPa2Fcm0nLIJiFfXEdJILBkdYzGCQargYmNsKXzZi0pCUgCHChu0pMSKGoHzmfW4ihUA3RkiyI64x6zEk9f0c0aeKDTxlXoiKI0CSAxTjPgSaAviNEYDkvOJubrDHRfQfdDOBg7ek/C48mvIR8XKMJWqnpSAl3DbmSNrGqVErt+jBK7f46lDhIAb7qQaCYSbrmS0XV0u5TyvYKhMODJ1/KSmdt/TC7h38AL/m/pTYzaQZgAAAAASUVORK5CYII=', 'base64') })
  return icon
}
