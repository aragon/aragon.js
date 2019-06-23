export default function (request, proxy, wrapper) {
  let member = request.params[0]
  wrapper.setMembership(
    member,
    wrapper.checkMember(member)
  )
  return wrapper.checkMember(member)
}
