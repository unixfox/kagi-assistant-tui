import TurndownService from "turndown";

const turndownService = new TurndownService({
  codeBlockStyle: "fenced",
});

export default turndownService;
