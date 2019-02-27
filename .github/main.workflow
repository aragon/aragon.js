workflow "Lint, test, and build" {
  on = "push"
  resolves = ["install", "bootstrap", "lint", "test", "size"]
}

action "install" {
  uses = "actions/npm@master"
  args = "install"
}

action "bootstrap" {
  uses = "actions/npm@master"
  args = "run bootstrap"
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