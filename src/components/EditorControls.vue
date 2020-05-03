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
      <v-card class="d-flex pa-5">
        <div class="mr-5">
          <div class="title">Action</div>
          <v-radio-group
            :mandatory="true"
            :value="animationAction"
            @change="value=>$emit('update-animation-action', value)"
          >
            <v-radio label="Preview" value="preview" />
            <v-radio label="Export" value="export" />
          </v-radio-group>
        </div>
        <div class="mr-5">
          <div class="title">Resolution</div>
          <v-radio-group
            :mandatory="true"
            :value="outputResolution"
            :disabled="animationAction === 'preview'"
            @change="value=>$emit('update-output-resolution', value)"
          >
            <v-radio label="2160p" :value="2160" />
            <v-radio label="1440p" :value="1440" />
            <v-radio label="1080p" :value="1080" />
            <v-radio label="720p" :value="720" />
          </v-radio-group>
        </div>
        <div>
          <div class="title">Frame Rate</div>
          <v-radio-group
            :mandatory="true"
            :value="fps"
            :disabled="animationAction === 'preview'"
            @change="value=>$emit('update-fps', value)"
          >
            <v-radio label="60" :value="60" />
            <v-radio label="30" :value="30" />
          </v-radio-group>
        </div>
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
      outputResolution: Number,
      fps: Number,
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
.v-menu__content {
  max-height: unset !important;
}
</style>
