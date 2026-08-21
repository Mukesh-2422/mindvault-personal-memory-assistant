const { v4: uuidv4 } = require("uuid");
const { getCollection, insertOne, updateOne, deleteOne, findById } = require("../db");

async function getUserPeople(userId) {
  return getCollection("people", { userId });
}

async function getPeople(req, res) {
  try {
    const people = await getUserPeople(req.user.id);
    res.json(people);
  } catch (err) {
    console.error("Error fetching people:", err);
    res.status(500).json({ error: "Failed to fetch people" });
  }
}

async function createPerson(req, res) {
  try {
    const { name, relationship, phone, email, birthday, notes } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });

    const person = {
      id: uuidv4(),
      userId: req.user.id,
      name: name.trim(),
      relationship: relationship ? relationship.trim() : null,
      phone: phone ? phone.trim() : null,
      email: email ? email.trim() : null,
      birthday: birthday || null,
      notes: notes ? notes.trim() : null,
      createdAt: new Date().toISOString(),
      lastInteraction: new Date().toISOString(),
      relatedMemoryIds: [],
      avatar: null,
    };

    await insertOne("people", person);
    res.status(201).json(person);
  } catch (err) {
    console.error("Error creating person:", err);
    res.status(500).json({ error: "Failed to create person" });
  }
}

async function getPersonById(req, res) {
  try {
    const person = await findById("people", req.params.id);
    if (!person || person.userId !== req.user.id) {
      return res.status(404).json({ error: "Person not found" });
    }
    res.json(person);
  } catch (err) {
    console.error("Error fetching person:", err);
    res.status(500).json({ error: "Failed to fetch person" });
  }
}

async function updatePerson(req, res) {
  try {
    const existing = await findById("people", req.params.id);
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ error: "Person not found" });
    }

    const allowed = [
      "name",
      "relationship",
      "phone",
      "email",
      "birthday",
      "notes",
      "lastInteraction",
      "relatedMemoryIds",
      "avatar",
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const updated = await updateOne("people", req.params.id, updates);
    res.json(updated);
  } catch (err) {
    console.error("Error updating person:", err);
    res.status(500).json({ error: "Failed to update person" });
  }
}

async function deletePerson(req, res) {
  try {
    const existing = await findById("people", req.params.id);
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ error: "Person not found" });
    }
    await deleteOne("people", req.params.id);
    res.json({ message: "Person deleted" });
  } catch (err) {
    console.error("Error deleting person:", err);
    res.status(500).json({ error: "Failed to delete person" });
  }
}

module.exports = {
  getPeople,
  createPerson,
  getPersonById,
  updatePerson,
  deletePerson,
};
