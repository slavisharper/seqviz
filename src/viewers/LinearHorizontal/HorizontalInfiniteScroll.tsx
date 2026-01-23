import * as React from "react";

import { Size } from "../../core/elements";
import CentralIndexContext from "../../state/centralIndexContext";

interface HorizontalInfiniteScrollProps {
  blockWidth: number;
  seqBlocks: React.JSX.Element[];
  size: Size;
  totalWidth: number;
}

interface HorizontalInfiniteScrollState {
  centralIndex: number;
  visibleBlocks: number[];
}

interface HorizontalInfiniteScrollSnapshot {
  blockIndex: number;
  blockX: number;
}

/**
 * HorizontalInfiniteScroll renders only the horizontally visible SeqBlocks in a single-row scroller.
 */
export class HorizontalInfiniteScroll extends React.PureComponent<
  HorizontalInfiniteScrollProps,
  HorizontalInfiniteScrollState
> {
  static contextType = CentralIndexContext;
  static context: React.ContextType<typeof CentralIndexContext>;
  declare context: React.ContextType<typeof CentralIndexContext>;

  scroller: React.RefObject<HTMLDivElement | null> = React.createRef();
  insideDOM: React.RefObject<HTMLDivElement | null> = React.createRef();

  constructor(props: HorizontalInfiniteScrollProps) {
    super(props);
    this.state = {
      centralIndex: 0,
      visibleBlocks: [],
    };
  }

  componentDidMount = () => {
    this.handleScrollOrResize();
    window.addEventListener("resize", this.handleScrollOrResize);
  };

  componentDidUpdate = (
    prevProps: HorizontalInfiniteScrollProps,
    prevState: HorizontalInfiniteScrollState,
    snapshot: HorizontalInfiniteScrollSnapshot,
  ) => {
    if (!this.scroller.current) return;

    const { seqBlocks, size } = this.props;
    const { centralIndex, visibleBlocks } = this.state;

    if (this.context && centralIndex !== this.context.linear) {
      this.scrollToCentralIndex();
    } else if (prevProps.size.width !== size.width || seqBlocks.length !== prevProps.seqBlocks.length) {
      this.handleScrollOrResize();
    } else if (prevState.visibleBlocks.join(",") === visibleBlocks.join(",")) {
      this.restoreSnapshot(snapshot);
    }
  };

  componentWillUnmount = () => {
    window.removeEventListener("resize", this.handleScrollOrResize);
  };

  getSnapshotBeforeUpdate = (prevProps: HorizontalInfiniteScrollProps): HorizontalInfiniteScrollSnapshot => {
    const left = this.scroller.current ? this.scroller.current.scrollLeft : 0;
    const blockWidth = prevProps.blockWidth || 1;
    const blockIndex = Math.floor(left / blockWidth);
    const blockX = left - blockIndex * blockWidth;
    return { blockIndex, blockX };
  };

  scrollToCentralIndex = () => {
    if (!this.scroller.current) return;

    const { blockWidth, seqBlocks } = this.props;
    const { clientWidth, scrollWidth } = this.scroller.current;
    const centralIndex = this.context.linear;

    // Find the first block that contains the new central index
    const centerBlockIndex = seqBlocks.findIndex(block => {
      const firstBase = block.props.firstBase as number;
      const bpsPerBlock = block.props.bpsPerBlock as number;
      return firstBase <= centralIndex && firstBase + bpsPerBlock >= centralIndex;
    });

    if (centerBlockIndex > -1) {
      const targetLeft = centerBlockIndex * blockWidth;
      const maxLeft = Math.max(0, scrollWidth - clientWidth);
      this.scroller.current.scrollLeft = Math.min(Math.max(targetLeft - blockWidth * 0.5, 0), maxLeft);
      this.setState({ centralIndex });
      this.handleScrollOrResize();
    }
  };

  restoreSnapshot = (snapshot: HorizontalInfiniteScrollSnapshot) => {
    if (!this.scroller.current) return;
    const { blockIndex, blockX } = snapshot;
    const { blockWidth } = this.props;
    const scrollLeft = blockIndex * blockWidth + blockX;
    this.scroller.current.scrollLeft = scrollLeft;
  };

  handleScrollOrResize = () => {
    if (!this.scroller.current || !this.insideDOM.current) return;

    const { blockWidth, totalWidth } = this.props;
    const { clientWidth, scrollLeft } = this.scroller.current;

    const left = Math.max(0, Math.min(scrollLeft, Math.max(totalWidth - clientWidth, 0)));
    const right = left + clientWidth;

    const firstVisible = Math.max(0, Math.floor(left / blockWidth) - 2); // buffer
    const lastVisible = Math.floor(right / blockWidth) + 2; // buffer

    const visibleBlocks: number[] = [];
    for (let i = firstVisible; i <= lastVisible; i++) visibleBlocks.push(i);

    this.setState({ visibleBlocks });
  };

  render() {
    const { blockWidth, seqBlocks, size, totalWidth } = this.props;
    const { visibleBlocks } = this.state;

    return (
      <div
        ref={this.scroller}
        className="la-vz-horizontal-scroller"
        data-testid="la-vz-viewer-linear-horizontal"
        style={{
          cursor: "text",
          fontWeight: 300,
          height: "100%",
          outline: "none",
          overflowX: "scroll",
          overflowY: "hidden",
          padding: 10,
          position: "relative",
          width: "100%",
        }}
        onScroll={this.handleScrollOrResize}
      >
        <div
          ref={this.insideDOM}
          className="la-vz-seqblock-container-horizontal"
          style={{ height: size.height || 0, width: totalWidth, position: "relative" }}
        >
          {visibleBlocks.map(i => {
            const block = seqBlocks[i];
            if (!block) return null;
            return (
              <div key={block.key as string} style={{ position: "absolute", left: i * blockWidth, top: 0 }}>
                {block}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

export default HorizontalInfiniteScroll;
