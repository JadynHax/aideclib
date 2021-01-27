
const modifier = (text) => {
  // Define the persisting stop attribute of state upon starting the adventure
  if (state.stopped == undefined) {
    state.stopped = false
  }

  // Define the command array as well
  if (state.commands == undefined) {
    state.commands = []
  }

  // Parse any commands present in text
  modifiedText = parseCommand(text)

  // Set stop to our persistent stop attribute
  stop = stop || state.stopped

  return { text: modifiedText }
}

// Don't modify this part
modifier(text)
