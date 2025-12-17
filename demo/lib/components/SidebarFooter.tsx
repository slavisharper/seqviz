import * as React from "react";

const SidebarFooter = () => (
  <div className="sidebar-footer">
    <img
      alt="Lattice Automation"
      className="brand-logo"
      src="https://tools.latticeautomation.com/seqviz/lattice-brand.png"
    />
    <p>
      Created by{" "}
      <strong>
        <a href="https://latticeautomation.com/" rel="noopener noreferrer" target="_blank">
          Lattice Automation
        </a>
      </strong>
    </p>
    <hr />
    <img
      alt="Lab Thread"
      className="brand-logo"
      src="https://cdn.prod.website-files.com/683ed6945a5c48c31a0f0e8a/685d55f0e506194500ac6fb2_Primary%20Logo%20Full%20Color%402x.png"
    />
    <p>
      Enhanced by{" "}
      <strong>
        <a href="https://labthread.com/" rel="noopener noreferrer" target="_blank">
          Lab Thread
        </a>
      </strong>
    </p>
    <hr />
    <p>
      <a href="https://github.com/Lattice-Automation/seqviz" rel="noopener noreferrer" target="_blank">
        GitHub
      </a>
      <span>{"  |  "}</span>
      <a
        href="https://medium.com/@lattice.core/visualize-your-dna-sequences-with-seqviz-b1d945eb9684"
        rel="noopener noreferrer"
        target="_blank"
      >
        Story
      </a>
      <span>{"  |  "}</span>
      <a
        href="https://docs.google.com/forms/d/1ILD3UwPvdkQlM06En7Pl9VqVpN_-g5iWs-B6gjKh9b0/viewform?edit_requested=true"
        rel="noopener noreferrer"
        target="_blank"
      >
        Survey
      </a>
    </p>
    <p>
      <span>contact@latticeautomation.com</span>
    </p>
    <p>
      <span>info@labthread.com</span>
    </p>
  </div>
);

export default SidebarFooter;
