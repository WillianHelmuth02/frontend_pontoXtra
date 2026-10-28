const { withAndroidManifest } = require('expo/config-plugins');

// Aplicado pelo prebuild/EAS, sem manter pastas Android geradas no repositório.
module.exports = (config, { allowHttp = false } = {}) => withAndroidManifest(config, (mod) => {
  const application = mod.modResults.manifest.application?.[0];
  if (!application) throw new Error('Não foi possível configurar a rede no manifesto Android.');
  application.$ = application.$ || {};
  application.$['android:usesCleartextTraffic'] = String(allowHttp);
  return mod;
});
