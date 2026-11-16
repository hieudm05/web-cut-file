import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/base'],
  { files: ['**/*.vue'], languageOptions: { parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'] } } },
  { rules: { 'no-control-regex': 'off', 'no-undef': 'off' } },
]
