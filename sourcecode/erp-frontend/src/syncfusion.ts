import { L10n, loadCldr, registerLicense, setCulture } from '@syncfusion/ej2-base'
import numberingSystems from '@syncfusion/ej2-cldr-data/supplemental/numberingSystems.json'
import weekData from '@syncfusion/ej2-cldr-data/supplemental/weekData.json'
import viGregorian from '@syncfusion/ej2-cldr-data/main/vi/ca-gregorian.json'
import viNumbers from '@syncfusion/ej2-cldr-data/main/vi/numbers.json'
import viTimeZoneNames from '@syncfusion/ej2-cldr-data/main/vi/timeZoneNames.json'
import viLocale from '@syncfusion/ej2-locale/src/vi.json'

const licenseKey = import.meta.env.VITE_SYNCFUSION_LICENSE
if (licenseKey) {
  registerLicense(licenseKey)
}

loadCldr(numberingSystems, weekData, viGregorian, viNumbers, viTimeZoneNames)
L10n.load(viLocale)
setCulture('vi')
