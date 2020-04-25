<template>
  <div class="full-width full-height d-flex align-center justify-center">
    <v-card
      class="d-flex flex-column justify-space-between align-center px-5 py-8"
      :min-height="CARD_MIN_HEIGHT"
      :width="CARD_WIDTH"
    >
      <header class="d-flex justify-center title mb-8">
        {{ gettingStartedMessage }}
      </header>
      <v-expansion-panels flat hover>
        <v-expansion-panel v-for="data in panelData" :key="data.placeholder">
          <v-expansion-panel-header :disable-icon-rotate="mySelf[data.selected]">
            <span class="subtitle-1">{{ data.header }}</span>
            <template v-slot:actions>
              <v-icon v-if="_self[data.selected]" color="primary">
                mdi-check
              </v-icon>
              <v-icon v-else>$expand</v-icon>
            </template>
          </v-expansion-panel-header>
          <v-expansion-panel-content>
            {{ data.description }}
            <FilePicker
              v-model="mySelf[data.model]"
              :icon="data.icon"
              :placeholder="data.placeholder"
              :properties="data.properties"
            />
          </v-expansion-panel-content>
        </v-expansion-panel>
      </v-expansion-panels>
      <v-btn
        class="white--text mt-8"
        color="primary"
        height="50px"
        width="150px"
        :disabled="!allSelected"
        @click="updateConfig"
      >
        <span class="text-none">Continue</span>
      </v-btn>
    </v-card>
  </div>
</template>

<script>
  /* global __static */
  import * as consts from "../constants.js";
  import * as ncp from "ncp";
  import * as path from "path";
  import FilePicker from "./FilePicker.vue";
  const Store = require('electron-store');

  export default {
    name: "Config",
    components: {
      FilePicker,
    },
    data() {
      return {
        // A hack to make v-model dynamic
        // (https://github.com/vuejs/vue/issues/1056#issuecomment-520855108).
        mySelf: this,
        gettingStartedMessage: "A few things before we get started",
        pythonPath: null,
        manimPath: null,
        workspacePath: null,
        panelData: [
          {
            header: "Python",
            placeholder: "python",
            selected: "pythonSelected",
            description: "An installation of Python3.7+",
            icon: "mdi-language-python",
            properties: ['openFile'],
            model: "pythonPath",
          },
          {
            header: "Manim",
            placeholder: "manim.py",
            selected: "manimSelected",
            description: "A modified version of Manim designed to work with this app",
            icon: "mdi-github",
            properties: ['openFile'],
            model: "manimPath",
          },
          {
            header: "Workspace",
            placeholder: "workspace",
            selected: "workspaceSelected",
            description: "A place to store the code and other files this app will use",
            icon: "mdi-folder-multiple",
            properties: ['openDirectory', 'createDirectory'],
            model: "workspacePath",
          },
        ],
      };
    },
    created() {
      this.CARD_WIDTH = 580;
      this.CARD_MIN_HEIGHT = 400;
      this.store = new Store({ schema: consts.STORAGE_SCHEMA });
    },
    mounted() { },
    computed: {
      pythonSelected() { return this.pythonPath !== null },
      manimSelected() { return this.manimPath !== null },
      workspaceSelected() { return this.workspacePath !== null },
      allSelected() {
        return this.pythonSelected &&
               this.manimSelected &&
               this.workspaceSelected;
      }
    },
    methods: {
      updateConfig() {
        this.store.set('paths.manim', this.manimPath);
        this.store.set('paths.python', this.pythonPath);
        this.store.set('paths.workspace', this.workspacePath);

        ncp(
          path.join(__static, "projects"),
          path.join(this.workspacePath, "projects"),
          { clobber: false },
          err => {
            if (err && err !== 'EEXIST') {
              console.error(err);
            } else {
              this.$router.push(consts.ROOT_URL);
            }
          },
        );
      }
    },
  }
</script>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  margin: 4px 0 4px 0px;
}
</style>
