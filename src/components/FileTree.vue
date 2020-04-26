<template>
  <div style="height:3000px;width:3000px"/>
</template>

<script>
  import * as fs from "fs";
  export default {
    name: "FileTree",
    props: {
      rootPath: String,
    },
    methods: {
      refreshData() {
        fs.readdir(this.rootPath, (err, files) => {
          if (err) {
            console.error(err);
            return;
          }
          console.log(files);
        });
      },
    }
  }
</script>

<style lang="scss" scoped>

</style>
