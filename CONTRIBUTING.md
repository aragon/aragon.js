# Contributing to Aragon.js

:tada: Thank you for being interested in contributing to an Aragon Project! :tada:

The following is a set of guidelines and helpful pointers for contributing to Aragon.js. The keyword here is *guidelines*, not rules. As such, use your best judgement and feel free to propose changes to even this document.

## Code of Conduct

Everyone participating in this project is governed by the [Aragon Code of Conduct](http://wiki.aragon.one/documentation/Code_of_Conduct/). By participating, you are expected to uphold this code as well.

Please report unacceptable behavior to a maintainer through either Twitter or by shooting us an e-mail at contact [at] aragon.one.

## I Just Have A Question

Please don't file an issue with questions. It's easier for you and for us if you go directly to [our chat](https://aragon.chat), since it will keep our repositories clean and you will get a faster response.

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report. This helps contributors and maintainers understand your report, reproduce the behavior, and in turn squash the bug.

Before submitting a bug report, please make sure that you've searched through the issues and that there isn't already an issue describing the issue you are having.

### How Do I Submit A Good Bug Report?

Bugs are tracked as [GitHub issues](https://guides.github.com/features/issues/).

Explain the problem and include additional details to help maintainers reproduce the problem:

* **Use a clear and descriptive title** for the issue to identify the problem.
* **Describe the exact steps which reproduce the problem** in as many details as possible.
* **Provide specific examples to demonstrate the steps**. Include links to files or GitHub projects, or copy/pasteable snippets, which you use in those examples. If you're providing snippets in the issue, use [Markdown code blocks](https://help.github.com/articles/markdown-basics/#multiple-lines).
* **Describe the behavior you observed after following the steps** and point out what exactly is the problem with that behavior.
* **Explain which behavior you expected to see instead and why.**
* **Post a screenshot or a dump of the developer console**
* **If the problem wasn't triggered by a specific action**, describe what you were doing before the problem happened and share more information using the guidelines below.

Provide more context by answering these questions:

* **Did the problem start happening recently** (e.g. after updating to a new version) or was this always a problem?
* If the problem started happening recently, **can you reproduce the problem in an older version of Aragon.js?** What's the most recent version in which the problem doesn't happen?
* **Can you reliably reproduce the issue?** If not, provide details about how often the problem happens and under which conditions it normally happens.

Include details about your configuration and environment:

* **Which version of Node are you using?** You can get the exact version by running `node -v` in your terminal.
* **What's the name and version of the browser you're using**?

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion, including completely new features and minor improvements to existing functionality. Following these guidelines helps maintainers and the community understand your suggestion.

Before creating enhancement suggestions, please check that there is not already an existing feature suggestion for your feature, as you might find out that you don't need to create one. When you are creating an enhancement suggestion, please include as many details as possible.

### How Do I Submit A Good Enhancement Suggestion?

Enhancement suggestions are tracked as [GitHub issues](https://guides.github.com/features/issues/). Create an issue on that repository and provide the following information:

* **Use a clear and descriptive title** for the issue to identify the suggestion.
* **Provide a step-by-step description of the suggested enhancement** in as many details as possible.
* **Provide specific examples to demonstrate the steps**. Include copy/pasteable snippets which you use in those examples, as [Markdown code blocks](https://help.github.com/articles/markdown-basics/#multiple-lines).
* **Describe the current behavior** and **explain which behavior you expected to see instead** and why.
* **Explain why this enhancement would be useful** to most users and isn't something that can or should be implemented as a community package.

### Pull Requests

* Do not include issue numbers in the PR title
* Follow the [JavaScript](#javascript) styleguide.
* End all files with a newline
* Avoid platform-dependent code
* Place requires in the following order:
    * Built in Node Modules (such as `path`)
    * Local Modules (using relative paths)

## Your First Code Contribution

Unsure where to begin contributing? You can start by looking through these `good first issue` issues:

* [Good first issue](https://github.com/aragon/aragon.js/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22) - issues which should only require a few lines of code, and a test or two.

## Styleguides

### Commits

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line

>A good rule of thumb is that your commit message follows these rules if you can prefix it with "This commit will ..." and it makes sense.
>
>For example, "This commit will **add a feature**" vs "This commit will **added a feature**".

### JavaScript

All JavaScript must adhere to [JavaScript Standard Style](https://standardjs.com/).

* Prefer the object spread operator (`{...anotherObj}`) to `Object.assign()`
* Inline `export`s with expressions whenever possible
  ```js
  // Use this:
  export default class ClassName {

  }

  // Instead of:
  class ClassName {

  }
  export default ClassName
  ```
