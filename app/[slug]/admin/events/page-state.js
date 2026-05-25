export function getDetailEditId(selectedEvent, focusedEvent) {
  return selectedEvent && focusedEvent && selectedEvent.id === focusedEvent.id
    ? selectedEvent.id
    : "";
}
