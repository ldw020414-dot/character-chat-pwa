export const isStandalonePwa = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)

export const isIosSafari = () => {
  const ua = window.navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(ua)
  const isWebKit = /WebKit/.test(ua)
  const isOtherIosBrowser = /CriOS|FxiOS|EdgiOS/.test(ua)
  return isIos && isWebKit && !isOtherIosBrowser
}

export const shouldShowIosInstallHint = () => isIosSafari() && !isStandalonePwa()
