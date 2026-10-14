import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'rw.magomano.sacco',
  appName: 'Magomano SACCO',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  plugins: {
    CapacitorSQLite: {
      androidIsEncryption: true,
    },
  },
}

export default config
