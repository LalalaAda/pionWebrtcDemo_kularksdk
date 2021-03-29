declare module "*.vue" {
  import Vue from "vue";
  export default Vue;
}

// 用于解决typescript 不能import 图片的问题
declare module "*.svg";
declare module "*.png";
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.gif";
declare module "*.bmp";
declare module "*.tiff";
declare module "*.svg";
