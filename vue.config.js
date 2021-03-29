/* eslint-disable @typescript-eslint/no-var-requires */
// const fs = require("fs");
// const path = require("path");

module.exports = {
  chainWebpack: config => {
    const svgRule = config.module.rule("svg");
    svgRule.uses.clear();
    svgRule.use("svg-inline-loader").loader("svg-inline-loader");
  },
  css: {
    loaderOptions: {
      css: {
        // 这里的选项会传递给 css-loader
      },
      sass: {
        // 这里的选项会传递给 postcss-loader
        implementation: require("sass"),
        sassOptions: {
          indentedSyntax: true // optional
        }
      },
      scss: {}
    }
  },
  devServer: {
    // https: {
    //   key: fs.readFileSync(path.join(__dirname, "./config/certs/key.pem")),
    //   cert: fs.readFileSync(path.join(__dirname, "./config/certs/cert.pem"))
    // }
  }
};
