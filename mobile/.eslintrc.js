module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        // React Native'ning <Image> komponentida `alt` propi yo'q -
        // bu qoida faqat web uchun mos keladi.
        'jsx-a11y/alt-text': 'off',
      },
    },
  ],
};
