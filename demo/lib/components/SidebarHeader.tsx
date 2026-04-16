import * as React from "react";

interface SidebarHeaderProps {
  toggleSidebar: () => void;
}

const SidebarHeader = ({ toggleSidebar: _toggleSidebar }: SidebarHeaderProps) => (
  <div className="sidebar-header">
    <div id="header-left">
      <img alt="SeqViz" id="seqviz-graphic" src="https://tools.latticeautomation.com/seqviz/seqviz-logo.png" />
      <h3>Sequence Viewer</h3>
    </div>
  </div>
);

export default SidebarHeader;
