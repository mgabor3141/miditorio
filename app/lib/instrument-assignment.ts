import { MidiNote } from "tone/build/esm/core/type/NoteUnits";
import { FactorioInstrumentName } from "./data/factorio-instruments-by-id";
import { getFactorioInstrumentList, toFactorioInstrument } from "./factorio-instrument";
import { Track } from "@tonejs/midi";

export const assignInstruments = (track: Track): (FactorioInstrumentName | undefined)[] => {
    const instrumentAccordingToMidi = toFactorioInstrument(track.instrument)
    const factorioInstruments = getFactorioInstrumentList()
    
    // If no instrument makes sense, this track will be muted by default
    if (instrumentAccordingToMidi === undefined) {
        return [undefined]
    }

    // Start with suggested instrument, even if it can't play any notes
    const assignedInstruments: (FactorioInstrumentName | undefined)[] = [instrumentAccordingToMidi]

    let uncoveredNotes = track.notes.filter(note => 
        !factorioInstruments[instrumentAccordingToMidi].noteToFactorioNote(
            note.midi as MidiNote,
            { octaveShift: 0, velocityValues: [], factorioInstruments: [] },
            { globalNoteShift: 0, speedMultiplier: 1 }
        ).valid
)

    // Get list of available instruments (excluding already assigned ones and Drumkit)
    const availableInstruments = (Object.keys(factorioInstruments) as FactorioInstrumentName[])
        .filter(name => 
            name !== 'Drumkit' && 
            !assignedInstruments.includes(name)
        )

    // Keep adding instruments until all notes are covered or no more instruments available
    while (uncoveredNotes.length > 0 && availableInstruments.length > 0) {
        // Find best instrument to cover remaining notes
        let bestInstrument: FactorioInstrumentName | undefined
        let bestCoverage = 0

        for (const instrumentName of availableInstruments) {
            const instrument = factorioInstruments[instrumentName]
            const coverageCount = uncoveredNotes.filter(note =>
                instrument.noteToFactorioNote(
                    note.midi as MidiNote,
                    { octaveShift: 0, velocityValues: [], factorioInstruments: [] },
                    { globalNoteShift: 0, speedMultiplier: 1 }
                ).valid
            ).length

            if (coverageCount > bestCoverage) {
                bestCoverage = coverageCount
                bestInstrument = instrumentName
            }
        }

        // If no instrument can play any remaining notes, break
        if (!bestInstrument || bestCoverage === 0) break

        // Add best instrument and remove notes it covers
        assignedInstruments.push(bestInstrument)
        uncoveredNotes = uncoveredNotes.filter(note => 
            !factorioInstruments[bestInstrument!].noteToFactorioNote(
                note.midi as MidiNote,
                { octaveShift: 0, velocityValues: [], factorioInstruments: [] },
                { globalNoteShift: 0, speedMultiplier: 1 }
            ).valid
        )

        // Remove used instrument from available list
        const index = availableInstruments.indexOf(bestInstrument)
        availableInstruments.splice(index, 1)
    }

    return assignedInstruments
}
