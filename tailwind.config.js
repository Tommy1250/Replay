module.exports = {
  content: ["./src/client/*.{html,js}", "./src/*.{html,js}"],
  theme: {
    extend: {},
    spacing: {
      '1': '8px',
      '2': '12px',
      '3': '16px',
      '4': '24px',
      '5': '32px',
      '6': '48px',
    }
  },
  darkmode: {
    bg: '#1d1d1d',
    bgDark: '#1d1d1d',
    bgLight: '#1d1d1d',
    color: '#fafafa',
    colorDark: '#fafafa',
    colorLight: '#fafafa',
    toggle: {
      bg: '#1d1d1d',
      bgDark: '#1d1d1d',
      bgLight: '#1d1d1d',
      color: '#fafafa',
      colorDark: '#fafafa',
      colorLight: '#fafafa',
    }
  },
  plugins: [],
}
