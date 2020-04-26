<template>
  <div class="d-flex">
    <v-select
      class="mr-2"
      :items="sceneChoices"
      v-model="chosenScene"
      label="Scene"
      solo
      :disabled="!pythonFileSelected"
    />
    <v-btn
      class="mr-2"
      large
      min-height="48"
      @click="$emit('refresh-scene-choices')"
      :disabled="!pythonFileSelected"
    >
      <v-icon class="headline black--text">mdi-replay</v-icon>
    </v-btn>
    <v-btn
      large
      min-height="48"
      @click="$emit('run-manim')"
      color="primary"
      :disabled="!pythonFileSelected"
    >
      <v-icon class="headline white--text mr-2">mdi-cube-outline</v-icon>
      <span class="title">Run</span>
    </v-btn>
  </div>
</template>

<script>
  export default {
    name: "EditorControls",
    props: {
      sceneChoices: Array,
      chosenSceneProp: String,
      pythonFileSelected: Boolean,
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

</style>
