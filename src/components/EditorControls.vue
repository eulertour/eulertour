<template>
  <div class="d-flex">
    <v-select
      class="mr-2"
      :items="sceneChoices"
      v-model="chosenScene"
      label="Scene"
      solo
      :disabled="disabled"
    />
    <v-btn
      class="mr-2"
      large
      min-height="48"
      @click="$emit('refresh-scene-choices')"
      :disabled="disabled"
    >
      <v-icon class="headline black--text">mdi-replay</v-icon>
    </v-btn>
    <v-btn
      large
      min-height="48"
      @click="$emit('run-manim')"
      color="primary"
      :disabled="disabled"
      id="run-button"
    >
      <v-icon class="headline white--text mr-1">mdi-cube-outline</v-icon>
      <span v-if="animationAction === 'preview'" class="title text-none">Preview</span>
      <span v-else class="title text-none">Export</span>
    </v-btn>
    <v-menu
      :close-on-content-click="false"
      offset-y
      top
      auto
    >
      <template v-slot:activator="{ on }">
        <v-btn
          large
          min-height="48"
          color="primary"
          :disabled="disabled"
          id="run-settings-button"
          v-on="on"
        >
          <v-icon class="headline white--text mr-1">mdi-cog</v-icon>
        </v-btn>
      </template>
      <v-card class="pa-4">
        <v-radio-group
          :mandatory="true"
          :value="animationAction"
          @change="value=>$emit('update-animation-action', value)"
        >
          <v-radio label="Preview" value="preview" />
          <v-radio label="Export" value="export" />
        </v-radio-group>
      </v-card>
    </v-menu>
  </div>
</template>

<script>
  export default {
    name: "EditorControls",
    props: {
      sceneChoices: Array,
      chosenSceneProp: String,
      disabled: Boolean,
      animationAction: String,
    },
    computed: {
      chosenScene: {
        get() { return this.chosenSceneProp; },
        set(val) { this.$emit('chosen-scene-update', val); }
      },
    }
  }
</script>

<style lang="scss" scoped>
#run-button {
  border-radius: 4px 0 0 4px;
  border-right: 2px solid white !important;
}
#run-settings-button {
  border-radius: 0 4px 4px 0;
  width: 30px;
  min-width: 30px;
}
</style>
