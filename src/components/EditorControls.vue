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
      disabled: Boolean,
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
