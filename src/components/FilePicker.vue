<template>
  <v-text-field
    readonly
    :prepend-icon="icon"
    :value="value"
    :placeholder="placeholder"
    @click="showOpenDialog"
  />
</template>

<script>
  const dialog = require('electron').remote.dialog;

  export default {
    name: "FilePicker",
    props: {
      value: String,
      placeholder: String,
      icon: String,
      properties: Array,
      filters: Array,
    },
    methods: {
      showOpenDialog() {
        dialog.showOpenDialog(
          {
            filters: this.filters,
            properties: this.properties,
          },
          fileNames => {
            if (fileNames.length > 0) {
              this.$emit('input', fileNames[0]);
            }
          },
        );
      }
    }
  }
</script>

<style lang="scss" scoped>

</style>
