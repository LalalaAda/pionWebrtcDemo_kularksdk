<template>
  <div class="about">
    <h1>This is an about page</h1>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

@Component
export default class About extends Vue {}
</script>

<style lang="scss" scoped>
.test {
  width: 100%;
  justify-content: center;
  align-items: center;
  .test-box {
    display: flex;
    justify-content: space-evenly;
    width: 360px;
    margin: 28px auto 0;
    border: 2px dashed;
    padding: 10px 0;
    .test-item {
      position: relative;
      .svgico {
        width: 50px;
        height: 50px;
        color: #fff;
        background-color: #ccc;
        border-radius: 5px;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .badge {
        position: absolute;
        top: -10px;
        right: -10px;
        font-size: 22px;
      }
    }
  }
}
</style>
