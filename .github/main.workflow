workflow "Lint, test, and build" {
  on = "push"
  resolves = ["build", "lint", "test", "size"]
}

action "build" {
  uses = "actions/npm@master"
  args = "install"
}

action "lint" {
  needs = "build"
  uses = "actions/npm@master"
  args = "run lint"
}


action "test" {
  needs = "build"
  uses = "actions/npm@master"
  args = "test"
}

action "size" {
  needs = "build"
  uses = "actions/npm@master"
  args = "run size"
}