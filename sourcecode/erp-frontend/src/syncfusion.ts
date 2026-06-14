import { registerLicense } from '@syncfusion/ej2-base'

const licenseKey = import.meta.env.VITE_SYNCFUSION_LICENSE
if (licenseKey) {
  registerLicense(licenseKey)
}