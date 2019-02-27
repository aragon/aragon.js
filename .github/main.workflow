workflow "Lint, test, and build" {
  on = "push"
  resolves = ["install", "bootstrap", "lint", "test", "build", "size"]
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
  args = "run test"
}

action "build" {
  needs = "bootstrap"
  uses = "actions/npm@master"
  args = "run build"
}

action "size" {
  needs = "build"
  uses = "actions/npm@master"
  args = "run size"
}