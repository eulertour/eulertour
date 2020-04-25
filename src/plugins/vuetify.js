import Vue from 'vue';
import Vuetify from 'vuetify/lib';

import colors from 'vuetify/lib/util/colors';

Vue.use(Vuetify);

export default new Vuetify({
  theme: {
    themes: {
      light: {
        primary: colors.purple.lighten1,
        secondary: colors.red.darken1,
        accent: colors.purple.accent2,
      }
    }
  }
});
