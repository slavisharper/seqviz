global.TextEncoder = require("util").TextEncoder;

window.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

jest.mock("react-resize-detector", () => ({
  useResizeDetector: () => ({
    height: 600,
    ref: () => {
      // noop
    },
    width: 800,
  }),
}));
