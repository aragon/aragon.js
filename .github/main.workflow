workflow "Lint, test, and build" {
  on = "push"
}

action "Build" {
  uses = "actions/npm@master"
  args = "install"
}

action "Lint" {
  needs = "Build"
  uses = "actions/npm@master"
  args = "run lint"
}


action "Test" {
  needs = "Build"
  uses = "actions/npm@master"
  args = "test"
}

action "Size" {
  needs = "Build"
  uses = "actions/npm@master"
  args = "run size"
}

