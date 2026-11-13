import path from 'node:path';
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(94);
Config.setConcurrency(6);
// The film imports the app's own palette and Liquid Glass component from ../src. Both must use the
// film's single copy of React.
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: {
      ...(config.resolve?.alias as Record<string, string> | undefined),
      react: path.resolve('node_modules/react'),
      'react-dom': path.resolve('node_modules/react-dom'),
    },
  },
}));
