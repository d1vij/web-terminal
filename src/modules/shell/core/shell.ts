// main executor shell 

import { GlobalsFactory } from "../components/globals-factory";
import { tokenize } from "./tokenizer";
import { VariableValueIsMultipleWords, CommandContainsUnpairedQuoteError, CommandStartsWithQuotesError, TokenContainsQuoteInMiddleErrror, UndefinedCommandError, } from "./__errors"
import type { TCommand, Tokens } from "./__typing";
import { addColor, OutputTemplates } from "../../output-handler/formatter";
import { Colors } from "../../output-handler/typing/enums";
import { TerminalOutputHandler } from "../../output-handler/terminal-output-handler";
import { UserInputHandler } from "../../output-handler/user-input-handler";
import { parse } from "./parser";
import type { parserResults } from "./__typing";
import { VariableDoesNotExistsError } from "../components/__errors";
import { execute } from "./executor";
import { FileSystem } from "../components/file-system/file-system";

const __debugMode = "true"


export class Shell {
    /**
     * shell will 
     * first tokenize
     * then parse
     * then execute
     * then resolve (ie output to terminal)
     * 
     * resolution can come after any step using exception raising & handling
     */
    public globals: GlobalsFactory;
    constructor() {
        // initializes a new shell 
        this.globals = new GlobalsFactory();

        // initial stuff
        this.globals.vars.set("__debug", __debugMode);
        this.globals.vars.set("ping", "pong");

        const __test_dir = FileSystem.createDirectoryByPath("/temp/content", this.globals.fs.filesystem);
        FileSystem.createFile(__test_dir, "test.txt", "Hello World!");
        const __home = FileSystem.createDirectoryByPath("/home/", this.globals.fs.filesystem);
        FileSystem.createFile(__home, "info.txt", "Linux Bash terminal Emulated purely on browser")

    }
    public process() {
        const command = UserInputHandler.getUserInput();

        TerminalOutputHandler.printToTerminal(OutputTemplates.userInputPreview(command));
        UserInputHandler.clearUserInput();

        let toks: Tokens = [];
        try {
            toks = tokenize(command);
        } catch (err: any) {
            handleTokenizationErrors(err, command)
            return;
        }

        let results: parserResults;
        try {
            results = parse(toks);
        } catch (err) {
            handleParserErrors(err);
            return;
        }

        try {
            execute(results);
        } catch (err) {
            handleExecutorErrors(err);
            return;
        }
    }
}

function handleExecutorErrors(err: any) {
    if (err instanceof VariableValueIsMultipleWords) {
        TerminalOutputHandler.standardErrorOutput([
            `VariableValueIsMultipleWords: variables cannot be set values as multiple tokens, pass multiple words in quotations as single token.`
        ])
    }
    if(err instanceof UndefinedCommandError){
        TerminalOutputHandler.standardErrorOutput([
            `UndefinedCommandError: Command ${addColor(err.command, Colors.yellow_light)} does not exsits!`
        ])
    }
}


function handleParserErrors(err: any) {
    if (err instanceof VariableDoesNotExistsError) {
        TerminalOutputHandler.standardErrorOutput([
            `VariableDoesNotExistsError: Variable with name ${err.varName} does not exists !`
        ])
    }
}

function handleTokenizationErrors(err: Error, command: TCommand) {
    if (err instanceof CommandStartsWithQuotesError) {
        TerminalOutputHandler.standardErrorOutput([
            "TokenizationError: Command starts with quotations",
            `${addColor(command, Colors.yellow_light)}, cannot start with quotations`
        ])
        return;
    }
    else if (err instanceof TokenContainsQuoteInMiddleErrror) {
        const errAt = /(?:\w+\s+)?\w+[\'\"]\w+(?:\s+\w+)?/i.exec(command)![0];
        TerminalOutputHandler.standardErrorOutput([
            "TokenizationError: Command contains quote in middle",
            `Error at ${addColor(errAt, Colors.yellow_light)} in command ${command}`
        ])
        return;
    }
    else if (err instanceof CommandContainsUnpairedQuoteError) {
        TerminalOutputHandler.standardErrorOutput([
            "TokenizationError: Command contains unpaired quote",
            addColor("TODO: BEAUTIFY", Colors.yellow_light)
        ])
        return;
    }
    else {
        TerminalOutputHandler.standardErrorOutput(['unexpected error', err as any]) //FIXME: err as any
        return;
    }
}