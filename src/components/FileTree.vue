<template>
  <v-treeview
    style="position: absolute"
    class="full-width"
    :active="activeNode"
    :items="items"
    :load-children="fetchDirectoryContents"
    @update:active="updateActiveFile"
    activatable
    dense
    item-key="name"
    open-on-click
    return-object
  >
    <template v-slot:prepend="{ item, open }">
      <v-icon v-if="'children' in item">
        {{ open ? 'mdi-folder-open' : 'mdi-folder' }}
      </v-icon>
      <v-icon v-else>
        {{ iconFromFile(item.name) }}
      </v-icon>
    </template>
  </v-treeview>
</template>

<script>
  import * as fs from "fs";
  import * as path from "path";
  export default {
    name: "FileTree",
    props: { rootPath: String },
    data() {
      return {
        items: [],
        activeNode: [],
      };
    },
    mounted() { this.refreshData() },
    methods: {
      async refreshData() {
        return fs.promises.readdir(this.rootPath)
          .catch(err => {
            if (err.code === 'ENOENT') {
              // The root directory doesn't exist; do nothing.
              return [];
            } else {
              throw err;
            }
          })
          .then(files => {
            this.items = this.itemsFromFiles(files, /*parent=*/null);
          });
      },
      itemsFromFiles(files, parentItem) {
        let parentPath;
        if (parentItem === null) {
          parentPath = this.rootPath;
        } else {
          parentPath = path.join(this.rootPath, this.pathFromItem(parentItem));
        }
        return files.map(f => {
          let ret = { name: f, parent: parentItem };
          let stats = fs.statSync(path.join(parentPath, f));
          if (stats.isDirectory(stats)) {
            ret.children = [];
          }
          return ret;
        });
      },
      pathFromItem(item) {
        let tokens = [item.name];
        let curItem = item;
        while (curItem.parent !== null) {
          tokens.push(curItem.parent.name);
          curItem = curItem.parent;
        }
        tokens.reverse();
        return path.join(...tokens);
      },
      async fetchDirectoryContents(item) {
        let itemPath = path.join(this.rootPath, this.pathFromItem(item));
        return fs.promises.readdir(itemPath)
          .then(files => {
            item.children = this.itemsFromFiles(files, /*parent=*/item);
          });
      },
      iconFromFile(file) {
        if (file.endsWith('.py')) return 'mdi-language-python';
        return 'mdi-file-document-outline';
      },
      updateActiveFile(fileList) {
        console.assert(fileList.length === 1);
        this.$emit('select', this.pathFromItem(fileList[0]));
      }
    },
    watch: {
      rootPath() { this.refreshData() },
    },
  }
</script>

<style lang="scss" scoped>

</style>
