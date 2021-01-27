/*
MIT License

Copyright (c) 2021 JaonHax

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// Command class to make for easier command definitions.
class Command {
  constructor(name, usage, description, callback, predicate = function(args) {
    return true;
  }, visible=true) {
    this.name = name;
    this.description = description;
    this.callback = callback;
    this.predicate = predicate;
    this.visible = visible;
  }
  run(args) {
    stop = true;

    if (!this.predicate(args)) {
      return `${this.usage}\n\n${this.description}`;
    }

    return this.callback(args);
  }
}

function enableOutput() {
  state.stopped = false;
}

function disableOutput() {
  state.stopped = true;
}

function toggleOutput() {
  state.stopped = !state.stopped;
}

function groupArgs(args) {
  // Change if you want to have different delimiters. Format is either one
  // string (used on both sides), or an array of two strings, one for opening,
  // one for closing.
  const delims = ['"', "'", ["[", "]"], ["(", ")"], ["{", "}"]];

  // Set up some predefined variables for parsing argument grouping
  var resultArgs = [];
  var delim = '';
  var combiner = [];

  // Iterate through args, using quotations to group arguments possessing spaces
  for (var item of args) {
    if (!delim) {
      for (var delimiter of delims) {
        let open = typeof delimiter === "string" ? delimiter : delimiter[0];
        let close = typeof delimiter === "string" ? delimiter : delimiter[1];

        if (item.startsWith(open)) {
          delim = close;
          combiner.push(item.slice(open.length));
          break;
        }
      }

      if (!combiner) {
        resultArgs.push(item);
      }

    } else if (item.endsWith(delim)) {
      combiner.push(item.slice(0, -delim.length));
      resultArgs.push(combiner.join(' '));
      delim = '';
      combiner = [];

    } else {
      combiner.push(item);
    }
  }

  if (combiner) {
    resultArgs.push(combiner.join(' '));
  }

  return resultArgs;
}

function getCommandByName(name) {
  name = name.toLowerCase()

  for (var command of state.commands) {
    if (command.name.toLowerCase() == name) {
      return command
    }
  }
}

function parseCommand(text) {
  var output = "";
  const defaultPrefix = "!";    // Change "!" to what you want the default command prefix to be.
  const commandPrefixRe = `(?:${state.commandPrefix})|(?:${defaultPrefix})`;    // Make it so the default prefix or the user-set prefix can be used.

  // Set up the actual regular expression so we can use it to parse commands
  const commandRegExp = new RegExp(
    `^\\s?(?:>\\sYou\\s(?:say\\s("))?)?(?<fullCommand>(?:(?:${commandPrefixRe}|!)help(?:\\s(?<helpTopic>[\\w-_0-9]+?))?)|(?:(?:${commandPrefixRe}|!)prefix(?:\\s(?<prefix>.+))?)|(?:${commandPrefixRe}(?<command>[\\w-_0-9]+?)(?:\\s(?<args>.+?))?))\\.?\\1$`,
    "im");
  const commandMatcher = text.match(commandRegExp);    // Match if there's a command present in the text

  if (commandMatcher) {
    // Built-in help command
    if ([1, (state.commandPrefix ? state.commandPrefix.length : undefined), defaultPrefix.length].includes(commandMatcher.groups['fullCommand'].indexOf('help'))) {
      stop = true;     // Make sure to stop AI output
      output += `> ${commandMatcher.groups['fullCommand']}\n\nHelp command output:\n${'-'.repeat(40)}`;

      if (!commandMatcher.groups['helpTopic']) {
        output += `\n    help                    Displays detailed help about a command or lists all commands.\n    prefix                  Displays the current command prefix or sets a new one.`;
      } else if (commandMatcher.groups['helpTopic'].toLowerCase() == 'help') {
        output += `\nUsage: help [topic]\n\nDisplays detailed help about a command or lists all commands.\n\nPositional arguments:\n    [topic]       The command to display detailed help about.`;
      } else if (commandMatcher.groups['helpTopic'].toLowerCase() == 'prefix') {
        output += `\nUsage: prefix [new_prefix]\n\nDisplays the current command prefix or sets a new one.\n\nPositional arguments:\n    [new_prefix]  The new command prefix to set.`;
      }

      for (var command of state.commands) {
        if (!commandMatcher.groups['helpTopic']) {
          output += `\n    ${command.name} ${" ".repeat(Math.max(20 - command.name.length, 0))} ${command.description.split('.')[0]}.`;
        } else if (commandMatcher.groups['helpTopic'].toLowerCase() == command.name.toLowerCase()) {
          output += `\n${command.usage}\n\n${command.description}`;
        }
      }

      return `${output}\n`;

    // Built-in prefix command
    } else if ([1, (state.commandPrefix ? state.commandPrefix.length : undefined), defaultPrefix.length].includes(commandMatcher.groups['fullCommand'].indexOf('prefix'))) {
      stop = true;     // Make sure to stop AI output
      output += `> ${commandMatcher.groups['fullCommand']}\n`;

      if (!commandMatcher.groups['prefix']) {
        output += state.commandPrefix ? `Your current command prefixes are "${state.commandPrefix}" and "${defaultPrefix}".` : `Your current command prefix is "${defaultPrefix}"`;
      } else {
        state.commandPrefix = commandMatcher.groups['prefix'];
        output += `The command prefix has now been set to "${state.commandPrefix}".`;
      }

      output += `\nRemember that for the "prefix" and "help" commands, you can always use the built-in "!" prefix!`;

      return `${output}\n`;

    } else {
      // Get command and initial args
      const command = getCommandByName(commandMatcher.groups['command']);
      var args = commandMatcher.groups['args'] ? groupArgs(commandMatcher.groups['args'].trim().split(' ')) : [];
      args.unshift(commandMatcher.groups['fullCommand'].slice(commandPrefix.length))

      if (command) {
        // Display command that was run if command should be visible
        if (command.visible) {
          output += `> ${commandMatcher.groups['fullCommand']}\n`;
        }

        output += command.run(args);    // Display the command's text output
        return `${output}\n`;
      } else {
        return `> ${commandMatcher.groups['fullCommand']}\n"${commandMatcher.groups['command']}" is not an available command!\nDid you mean one of these?\n    ${getCloseMatches(commandMatcher.groups['command'], state.commands.map(function(command){return command.name}), 5).join('\n    ')}`;
      }
    }
  }

  return text;    // If no command, display text as usual
}

function addCommand(name, usage, description, callback, predicate=function() {
      return true
      }, visible=true) {
  const command = new Command(name, usage, description, callback, predicate, visible);

  state.commands.push(command);
}

function getCloseMatches(word, possibilities, n = 3, cutoff = 0.6) {
  if (n <= 0) throw "n must be > 0: " + n;
  if (!(0.0 <= cutoff <= 1.0)) throw "cutoff must be in [0.0, 1.0]: " + cutoff;

  result = [];
  s = difflib.SequenceMatcher();
  s.set_seq2(word);

  for (x of possibilities) {
    s.set_seq1(x);

    if (s.real_quick_ratio() >= cutoff && s.quick_ratio() >= cutoff && s
    .ratio() >= cutoff) {
      result.push([s.ratio(), x]);
    }
  }

  result.sort(function(a, b) {
    return b[0] - a[0];
  })
  return result.slice(0, n).map(function(item) {
    return item[1];
  })
}

// The following is copied from jsdifflib directly, since its API is so similar
// to Python's difflib module that it was the most convenient to use.

/***
This is part of jsdifflib v1.0. <http://snowtide.com/jsdifflib>
Copyright (c) 2007, Snowtide Informatics Systems, Inc.
All rights reserved.
Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:
	* Redistributions of source code must retain the above copyright notice, this
		list of conditions and the following disclaimer.
	* Redistributions in binary form must reproduce the above copyright notice,
		this list of conditions and the following disclaimer in the documentation
		and/or other materials provided with the distribution.
	* Neither the name of the Snowtide Informatics Systems nor the names of its
		contributors may be used to endorse or promote products derived from this
		software without specific prior written permission.
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR
BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
DAMAGE.
***/
/* Author: Chas Emerick <cemerick@snowtide.com> */
var __whitespace = {
  " ": true,
  "\t": true,
  "\n": true,
  "\f": true,
  "\r": true
};

var difflib = {
  defaultJunkFunction: function(c) {
    return __whitespace.hasOwnProperty(c);
  },

  stripLinebreaks: function(str) {
    return str.replace(/^[\n\r]*|[\n\r]*$/g, "");
  },

  stringAsLines: function(str) {
    var lfpos = str.indexOf("\n");
    var crpos = str.indexOf("\r");
    var linebreak = ((lfpos > -1 && crpos > -1) || crpos < 0) ? "\n" : "\r";

    var lines = str.split(linebreak);
    for (var i = 0; i < lines.length; i++) {
      lines[i] = difflib.stripLinebreaks(lines[i]);
    }

    return lines;
  },

  // iteration-based reduce implementation
  __reduce: function(func, list, initial) {
    if (initial != null) {
      var value = initial;
      var idx = 0;
    } else if (list) {
      var value = list[0];
      var idx = 1;
    } else {
      return null;
    }

    for (; idx < list.length; idx++) {
      value = func(value, list[idx]);
    }

    return value;
  },

  // comparison function for sorting lists of numeric tuples
  __ntuplecomp: function(a, b) {
    var mlen = Math.max(a.length, b.length);
    for (var i = 0; i < mlen; i++) {
      if (a[i] < b[i]) return -1;
      if (a[i] > b[i]) return 1;
    }

    return a.length == b.length ? 0 : (a.length < b.length ? -1 : 1);
  },

  __calculate_ratio: function(matches, length) {
    return length ? 2.0 * matches / length : 1.0;
  },

  // returns a function that returns true if a key passed to the returned function
  // is in the dict (js object) provided to this function; replaces being able to
  // carry around dict.has_key in python...
  __isindict: function(dict) {
    return function(key) {
      return dict.hasOwnProperty(key);
    };
  },

  // replacement for python's dict.get function -- need easy default values
  __dictget: function(dict, key, defaultValue) {
    return dict.hasOwnProperty(key) ? dict[key] : defaultValue;
  },

  SequenceMatcher: function(a, b, isjunk) {
    this.set_seqs = function(a, b) {
      this.set_seq1(a);
      this.set_seq2(b);
    }

    this.set_seq1 = function(a) {
      if (a == this.a) return;
      this.a = a;
      this.matching_blocks = this.opcodes = null;
    }

    this.set_seq2 = function(b) {
      if (b == this.b) return;
      this.b = b;
      this.matching_blocks = this.opcodes = this.fullbcount = null;
      this.__chain_b();
    }

    this.__chain_b = function() {
      var b = this.b;
      var n = b.length;
      var b2j = this.b2j = {};
      var populardict = {};
      for (var i = 0; i < b.length; i++) {
        var elt = b[i];
        if (b2j.hasOwnProperty(elt)) {
          var indices = b2j[elt];
          if (n >= 200 && indices.length * 100 > n) {
            populardict[elt] = 1;
            delete b2j[elt];
          } else {
            indices.push(i);
          }
        } else {
          b2j[elt] = [i];
        }
      }

      for (var elt in populardict) {
        if (populardict.hasOwnProperty(elt)) {
          delete b2j[elt];
        }
      }

      var isjunk = this.isjunk;
      var junkdict = {};
      if (isjunk) {
        for (var elt in populardict) {
          if (populardict.hasOwnProperty(elt) && isjunk(elt)) {
            junkdict[elt] = 1;
            delete populardict[elt];
          }
        }
        for (var elt in b2j) {
          if (b2j.hasOwnProperty(elt) && isjunk(elt)) {
            junkdict[elt] = 1;
            delete b2j[elt];
          }
        }
      }

      this.isbjunk = difflib.__isindict(junkdict);
      this.isbpopular = difflib.__isindict(populardict);
    }

    this.find_longest_match = function(alo, ahi, blo, bhi) {
      var a = this.a;
      var b = this.b;
      var b2j = this.b2j;
      var isbjunk = this.isbjunk;
      var besti = alo;
      var bestj = blo;
      var bestsize = 0;
      var j = null;
      var k;

      var j2len = {};
      var nothing = [];
      for (var i = alo; i < ahi; i++) {
        var newj2len = {};
        var jdict = difflib.__dictget(b2j, a[i], nothing);
        for (var jkey in jdict) {
          if (jdict.hasOwnProperty(jkey)) {
            j = jdict[jkey];
            if (j < blo) continue;
            if (j >= bhi) break;
            newj2len[j] = k = difflib.__dictget(j2len, j - 1, 0) + 1;
            if (k > bestsize) {
              besti = i - k + 1;
              bestj = j - k + 1;
              bestsize = k;
            }
          }
        }
        j2len = newj2len;
      }

      while (besti > alo && bestj > blo && !isbjunk(b[bestj - 1]) && a[
          besti - 1] == b[bestj - 1]) {
        besti--;
        bestj--;
        bestsize++;
      }

      while (besti + bestsize < ahi && bestj + bestsize < bhi &&
        !isbjunk(b[bestj + bestsize]) &&
        a[besti + bestsize] == b[bestj + bestsize]) {
        bestsize++;
      }

      while (besti > alo && bestj > blo && isbjunk(b[bestj - 1]) && a[
          besti - 1] == b[bestj - 1]) {
        besti--;
        bestj--;
        bestsize++;
      }

      while (besti + bestsize < ahi && bestj + bestsize < bhi && isbjunk(
          b[bestj + bestsize]) &&
        a[besti + bestsize] == b[bestj + bestsize]) {
        bestsize++;
      }

      return [besti, bestj, bestsize];
    }

    this.get_matching_blocks = function() {
      if (this.matching_blocks != null) return this.matching_blocks;
      var la = this.a.length;
      var lb = this.b.length;

      var queue = [
        [0, la, 0, lb]
      ];
      var matching_blocks = [];
      var alo, ahi, blo, bhi, qi, i, j, k, x;
      while (queue.length) {
        qi = queue.pop();
        alo = qi[0];
        ahi = qi[1];
        blo = qi[2];
        bhi = qi[3];
        x = this.find_longest_match(alo, ahi, blo, bhi);
        i = x[0];
        j = x[1];
        k = x[2];

        if (k) {
          matching_blocks.push(x);
          if (alo < i && blo < j)
            queue.push([alo, i, blo, j]);
          if (i + k < ahi && j + k < bhi)
            queue.push([i + k, ahi, j + k, bhi]);
        }
      }

      matching_blocks.sort(difflib.__ntuplecomp);

      var i1 = 0,
        j1 = 0,
        k1 = 0,
        block = 0;
      var i2, j2, k2;
      var non_adjacent = [];
      for (var idx in matching_blocks) {
        if (matching_blocks.hasOwnProperty(idx)) {
          block = matching_blocks[idx];
          i2 = block[0];
          j2 = block[1];
          k2 = block[2];
          if (i1 + k1 == i2 && j1 + k1 == j2) {
            k1 += k2;
          } else {
            if (k1) non_adjacent.push([i1, j1, k1]);
            i1 = i2;
            j1 = j2;
            k1 = k2;
          }
        }
      }

      if (k1) non_adjacent.push([i1, j1, k1]);

      non_adjacent.push([la, lb, 0]);
      this.matching_blocks = non_adjacent;
      return this.matching_blocks;
    }

    this.get_opcodes = function() {
      if (this.opcodes != null) return this.opcodes;
      var i = 0;
      var j = 0;
      var answer = [];
      this.opcodes = answer;
      var block, ai, bj, size, tag;
      var blocks = this.get_matching_blocks();
      for (var idx in blocks) {
        if (blocks.hasOwnProperty(idx)) {
          block = blocks[idx];
          ai = block[0];
          bj = block[1];
          size = block[2];
          tag = '';
          if (i < ai && j < bj) {
            tag = 'replace';
          } else if (i < ai) {
            tag = 'delete';
          } else if (j < bj) {
            tag = 'insert';
          }
          if (tag) answer.push([tag, i, ai, j, bj]);
          i = ai + size;
          j = bj + size;

          if (size) answer.push(['equal', ai, i, bj, j]);
        }
      }

      return answer;
    }

    // this is a generator function in the python lib, which of course is not supported in javascript
    // the reimplementation builds up the grouped opcodes into a list in their entirety and returns that.
    this.get_grouped_opcodes = function(n) {
      if (!n) n = 3;
      var codes = this.get_opcodes();
      if (!codes) codes = [
        ["equal", 0, 1, 0, 1]
      ];
      var code, tag, i1, i2, j1, j2;
      if (codes[0][0] == 'equal') {
        code = codes[0];
        tag = code[0];
        i1 = code[1];
        i2 = code[2];
        j1 = code[3];
        j2 = code[4];
        codes[0] = [tag, Math.max(i1, i2 - n), i2, Math.max(j1, j2 - n),
          j2
        ];
      }
      if (codes[codes.length - 1][0] == 'equal') {
        code = codes[codes.length - 1];
        tag = code[0];
        i1 = code[1];
        i2 = code[2];
        j1 = code[3];
        j2 = code[4];
        codes[codes.length - 1] = [tag, i1, Math.min(i2, i1 + n), j1, Math
          .min(j2, j1 + n)
        ];
      }

      var nn = n + n;
      var group = [];
      var groups = [];
      for (var idx in codes) {
        if (codes.hasOwnProperty(idx)) {
          code = codes[idx];
          tag = code[0];
          i1 = code[1];
          i2 = code[2];
          j1 = code[3];
          j2 = code[4];
          if (tag == 'equal' && i2 - i1 > nn) {
            group.push([tag, i1, Math.min(i2, i1 + n), j1, Math.min(j2,
              j1 + n)]);
            groups.push(group);
            group = [];
            i1 = Math.max(i1, i2 - n);
            j1 = Math.max(j1, j2 - n);
          }

          group.push([tag, i1, i2, j1, j2]);
        }
      }

      if (group && !(group.length == 1 && group[0][0] == 'equal')) groups
        .push(group)

      return groups;
    }

    this.ratio = function() {
      matches = difflib.__reduce(
        function(sum, triple) {
          return sum + triple[triple.length - 1];
        },
        this.get_matching_blocks(), 0);
      return difflib.__calculate_ratio(matches, this.a.length + this.b
        .length);
    }

    this.quick_ratio = function() {
      var fullbcount, elt;
      if (this.fullbcount == null) {
        this.fullbcount = fullbcount = {};
        for (var i = 0; i < this.b.length; i++) {
          elt = this.b[i];
          fullbcount[elt] = difflib.__dictget(fullbcount, elt, 0) + 1;
        }
      }
      fullbcount = this.fullbcount;

      var avail = {};
      var availhas = difflib.__isindict(avail);
      var matches = numb = 0;
      for (var i = 0; i < this.a.length; i++) {
        elt = this.a[i];
        if (availhas(elt)) {
          numb = avail[elt];
        } else {
          numb = difflib.__dictget(fullbcount, elt, 0);
        }
        avail[elt] = numb - 1;
        if (numb > 0) matches++;
      }

      return difflib.__calculate_ratio(matches, this.a.length + this.b
        .length);
    }

    this.real_quick_ratio = function() {
      var la = this.a.length;
      var lb = this.b.length;
      return _calculate_ratio(Math.min(la, lb), la + lb);
    }

    this.isjunk = isjunk ? isjunk : difflib.defaultJunkFunction;
    this.a = this.b = null;
    this.set_seqs(a, b);
  }
};
