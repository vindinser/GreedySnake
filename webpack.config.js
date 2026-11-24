// 引入path包
const path = require("path")
// 引入HTML插件
const HTMLWebpackPlugin = require("html-webpack-plugin")
const { CleanWebpackPlugin } = require("clean-webpack-plugin")

// webpack中所有的配置信息
module.exports = (env, argv) => {
  // 通过 `--mode production` 切换生产构建：npm run build:prod
  const isProd = argv.mode === "production"

  return {
    // 指定入口文件
    entry: "./src/index.ts",
    // 打包文件所在目录
    output: {
      path: path.resolve(__dirname, 'dist'), // 指定打包目录
      filename: isProd ? "js/[name].[contenthash:8].js" : "bundle.js",
      // 动态 import() 产生的异步块（第三方库按需加载走这里）
      chunkFilename: isProd ? "js/[name].[contenthash:8].chunk.js" : "js/[name].chunk.js",
      environment: {
        arrowFunction: false, // webpack 运行时降级为 ES5（只影响运行时产物，不影响业务代码）
        const: false // 同上
      }
    },
    // 设置mode
    mode: isProd ? "production" : "development",
    // 指定webpack打包时要使用的模块
    module: {
      rules: [
        {
          test: /\.ts$/, // 规则生效文件
          use: [
            {
              loader: "babel-loader", // 指定加载器
              options: {
                "presets": [
                  [
                    "@babel/preset-env", // 指定环境插件
                    {
                      targets: {
                        "chrome": "108"
                      }, // 要兼容的目标浏览器
                      "corejs": "3", // 指定corejs版本
                      "useBuiltIns": "usage" // 使用corejs方法(usage 表示按需加载)
                    } // 配置信息
                  ]
                ]
              }
            }, // 指定babel
            'ts-loader'
          ], // 要使用的loader
          exclude: /node_modules/ // 排除 node_modules：三方库不经过 babel/core-js 处理
        },
        { // 规则生效文件
          test: /\.less$/, // 要处理的less文件
          use: [
            "style-loader",
            "css-loader",
            // 引入postcss，解决浏览器兼容性问题
            {
              loader: "postcss-loader",
              options: {
                postcssOptions: {
                  plugins: [
                    [
                      "postcss-preset-env",
                      {
                        browsers: "last 2 versions" // 兼容两个最新的浏览器
                      }
                    ]
                  ]
                }
              }
            },
            "less-loader"
          ]
        }
      ] // 规则生效文件
    },
    // 代码分割：每个动态 import() 独立成块，
    // 关闭默认的 vendor 合并，保证打开 3D 游戏不会顺带下载 matter.js
    optimization: {
      splitChunks: {
        chunks: "async",
        cacheGroups: {
          defaultVendors: false,
          default: false
        }
      }
    },
    // 指定webpack插件
    plugins: [
      new CleanWebpackPlugin(),
      new HTMLWebpackPlugin({
        // title: "Hello TS"
        template: "./src/index.html"
      })
    ],
    // 用来设置引用模块
    resolve: {
      extensions: [".js", ".ts", ".mjs"]
    }
  }
}
