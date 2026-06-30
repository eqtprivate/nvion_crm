import React from 'react';

/** Exibe a mensagem de erro de validação de um campo, quando houver. */
export function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-xs text-red-600 mt-1">{message}</p>;
}

export default FieldError;
