import type { ThemeConfig } from 'antd';

const fontFamily =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif";

const fontFamilyCode =
  "'JetBrains Mono', 'SF Mono', 'Roboto Mono', Menlo, Consolas, 'Liberation Mono', monospace";

export const adminTheme: ThemeConfig = {
  cssVar: {},
  token: {
    colorPrimary: '#4f46e5',
    colorInfo: '#2563eb',
    colorSuccess: '#16a34a',
    colorWarning: '#d97706',
    colorError: '#dc2626',
    colorLink: '#4f46e5',

    colorBgLayout: '#f5f7fb',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',

    colorText: '#0f172a',
    colorTextSecondary: '#475569',
    colorTextTertiary: '#94a3b8',
    colorTextQuaternary: '#cbd5e1',

    colorBorder: 'rgba(15, 23, 42, 0.1)',
    colorBorderSecondary: 'rgba(15, 23, 42, 0.06)',
    colorSplit: 'rgba(15, 23, 42, 0.06)',

    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    borderRadiusXS: 4,

    fontFamily,
    fontFamilyCode,
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    fontWeightStrong: 600,

    controlHeight: 36,
    controlHeightLG: 40,
    controlHeightSM: 28,

    boxShadow:
      '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
    boxShadowSecondary:
      '0 4px 12px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.04)',
    boxShadowTertiary: '0 1px 2px rgba(15, 23, 42, 0.04)',

    lineHeight: 1.55,
    motionDurationMid: '0.18s',
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      headerHeight: 60,
      headerPadding: '0 24px',
      lightSiderBg: '#ffffff',
      bodyBg: '#f5f7fb',
      siderBg: '#ffffff',
    },
    Button: {
      controlHeight: 36,
      controlHeightSM: 28,
      paddingInline: 14,
      fontWeight: 500,
      primaryShadow: '0 1px 0 rgba(99, 102, 241, 0.18)',
    },
    Input: {
      controlHeight: 36,
      paddingInline: 12,
      activeShadow: '0 0 0 4px rgba(99, 102, 241, 0.16)',
    },
    Select: {
      controlHeight: 36,
    },
    Table: {
      headerBg: '#f5f7fb',
      headerColor: '#475569',
      headerSplitColor: 'rgba(15, 23, 42, 0.06)',
      rowHoverBg: '#eef2ff',
      borderColor: 'rgba(15, 23, 42, 0.06)',
      cellPaddingBlock: 12,
      cellPaddingInline: 14,
      cellFontSize: 13,
      headerBorderRadius: 8,
    },
    Card: {
      headerHeight: 44,
      headerBg: 'transparent',
      paddingLG: 20,
      boxShadowTertiary: '0 1px 3px rgba(15, 23, 42, 0.06)',
    },
    Modal: {
      borderRadiusLG: 12,
      padding: 24,
      titleFontSize: 16,
      titleColor: '#0f172a',
    },
    Drawer: {
      paddingLG: 24,
    },
    Tag: {
      defaultBg: '#f1f4f9',
      defaultColor: '#475569',
      borderRadiusSM: 6,
    },
    Tree: {
      titleHeight: 30,
      nodeHoverBg: '#eef2ff',
      nodeSelectedBg: '#e0e7ff',
      directoryNodeSelectedBg: '#e0e7ff',
      directoryNodeSelectedColor: '#4338ca',
    },
    Tooltip: {
      colorBgSpotlight: '#0f172a',
      colorTextLightSolid: '#f8fafc',
      borderRadius: 6,
    },
    Tabs: {
      titleFontSize: 14,
      itemActiveColor: '#4f46e5',
      itemHoverColor: '#4f46e5',
      inkBarColor: '#4f46e5',
    },
    Popover: {
      borderRadiusLG: 10,
    },
    Alert: {
      borderRadiusLG: 8,
      withDescriptionPadding: '14px 16px',
    },
    Descriptions: {
      labelColor: '#64748b',
      titleColor: '#0f172a',
    },
    Collapse: {
      headerPadding: '10px 14px',
      contentPadding: '0',
      borderRadiusLG: 8,
    },
  },
};
