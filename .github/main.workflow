workflow "Lint, test, and build" {
  on = "push"
  resolves = ["install"]
}

action "install" {
  uses = "actions/npm@master"
  args = "install"
}

action "bootstrap" {
  needs = "install"
  uses = "actions/npm@master"
  args = "run bootstrap"
}

action "lint" {
  needs = "bootstrap"
  uses = "actions/npm@master"
  args = "run lint"
}

action "test" {
  needs = "bootstrap"
  uses = "actions/npm@master"
  args = "test"
}

action "size" {
  needs = "bootstrap"
  uses = "actions/npm@master"
  args = "run size"
}