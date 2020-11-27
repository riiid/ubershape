import * as path from 'path';
import {
  SubshapeValidationError,
  SubshapeValidationErrorBase,
  SubshapeValidationErrorType,
} from '../subshape';
import {
  UbershapeValidationError,
  UbershapeValidationErrorBase,
  UbershapeValidationErrorType,
} from '../ubershape';
import { ReadResult } from './read-schema';
import { Span } from '../parser/recursive-descent-parser';
import { Def } from '../parser/ast';

export function printError(
  error: UbershapeValidationError | SubshapeValidationError,
  readResult: ReadResult,
  println: PrintlnFn = console.error
) {
  const schemaFilePath = path.relative(
    process.cwd(),
    readResult.absoluteSchemaFilePath
  );
  println(`at ${schemaFilePath}:`);
  if (error instanceof UbershapeValidationErrorBase) {
    ubershapeValidationErrorPrinters[error.errorType](
      error as any,
      println,
      printAroundText
    );
  } else if (error instanceof SubshapeValidationErrorBase) {
    subshapeValidationErrorPrinters[error.errorType](
      error as any,
      println,
      printAroundText
    );
  }
  println('\n');
  function printAroundText(span: Span) {
    const aroundText = readResult.parseResult.parser.getAroundText(
      span.start,
      span.end - span.start
    );
    println(aroundText);
  }
}

export interface PrintlnFn {
  (message: string): void;
}
export interface PrintAroundTextFn {
  (span: Span): void;
}

type UbershapeValidationErrorPrinters = {
  [errorType in UbershapeValidationErrorType]: ValidationErrorPrinter<
    Extract<UbershapeValidationError, { errorType: errorType }>
  >;
};
type SubshapeValidationErrorPrinters = {
  [errorType in SubshapeValidationErrorType]: ValidationErrorPrinter<
    Extract<SubshapeValidationError, { errorType: errorType }>
  >;
};
interface ValidationErrorPrinter<TError extends Error> {
  (error: TError, println: PrintlnFn, printAroundText: PrintAroundTextFn): void;
}
const ubershapeValidationErrorPrinters: UbershapeValidationErrorPrinters = {
  [UbershapeValidationErrorType.EmptyDef](error, println, printAroundText) {
    println('');
    printDef(error.def, printAroundText);
    println('');
    println('the declaration is empty.');
  },
  [UbershapeValidationErrorType.RootNotExist](_error, println) {
    println('');
    println('root does not exist.');
  },
  [UbershapeValidationErrorType.TooManyRoot](error, println, printAroundText) {
    println('');
    for (const root of error.roots) {
      printAroundText(root);
      println('');
    }
    println('there are too many roots.');
  },
  [UbershapeValidationErrorType.DuplicateDef](error, println, printAroundText) {
    println('');
    printDef(error.def, printAroundText);
    println('');
    println('duplicate definition.');
  },
  [UbershapeValidationErrorType.DefDuplicateType](error, println, printAroundText) {
    println('');
    printAroundText(error.type);
    println('');
    println('duplicate type.');
  },
  [UbershapeValidationErrorType.DefDuplicateEnumValue](error, println, printAroundText) {
    println('');
    printAroundText(error.enumValue);
    println('');
    println('duplicate enum value.');
  },
  [UbershapeValidationErrorType.RecordDuplicateFieldName](error, println, printAroundText) {
    println('');
    printAroundText(error.fieldName);
    println('');
    println('duplicate field name.');
  },
  [UbershapeValidationErrorType.Reference](error, println, printAroundText) {
    println('');
    printAroundText(error.type);
    println('');
    println('there is no such type.');
  },
};

function printDef(def: Def, printAroundText: PrintAroundTextFn) {
  switch (def.kind) {
    case 'root':
      printAroundText({ start: def.start, end: def.start + 4 }); break;
    case 'union': case 'enum': case 'record':
      printAroundText(def.name); break;
  }
}

const subshapeValidationErrorPrinters: SubshapeValidationErrorPrinters = {
  [SubshapeValidationErrorType.SelectReference](error, println, printAroundText) {
    // TODO
  },
  [SubshapeValidationErrorType.OrphanSelect](error, println, printAroundText) {
    // TODO
  },
  [SubshapeValidationErrorType.SelectRequired](error, println, printAroundText) {
    // TODO
  },
  [SubshapeValidationErrorType.FieldSelectorReference](error, println, printAroundText) {
    // TODO
  },
  [SubshapeValidationErrorType.TypeSelectorReference](error, println, printAroundText) {
    // TODO
  },
  [SubshapeValidationErrorType.ValueSelectorReference](error, println, printAroundText) {
    // TODO
  },
};
