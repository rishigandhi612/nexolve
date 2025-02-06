import { Request, Response } from 'express';
import Query from '../models/CustomerQueries';

// Get all queries (for managers)
export const getAllQueries = async (req: Request, res: Response) => {
  try {
    const queries = await Query.find()
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 });
    res.json(queries);
  } catch (error) {
    console.error('Error fetching queries:', error);
    res.status(500).json({ message: 'Error fetching queries' });
  }
};

// Get user's queries (for customers)
export const getUserQueries = async (req: Request, res: Response) => {
  try {
    const userId = req.customer?.userId; // Access userId from req.customer
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const queries = await Query.find({ userId }).sort({ createdAt: -1 });
    res.json(queries);
  } catch (error) {
    console.error('Error fetching user queries:', error);
    res.status(500).json({ message: 'Error fetching queries' });
  }
};

// Create new query (for customers)
export const createQuery = async (req: Request, res: Response) => {
  try {
    const userId = req.customer?.userId; // Access userId from req.customer
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { subject, message, priority = 'medium' } = req.body;

    const query = new Query({
      userId,
      subject,
      message,
      priority,
      status: 'pending'
    });

    await query.save();
    res.status(201).json(query);
  } catch (error) {
    console.error('Error creating query:', error);
    res.status(500).json({ message: 'Error creating query' });
  }
};

// Update query status (for managers)
export const updateQueryStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const query = await Query.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('userId', 'fullName email');

    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    res.json(query);
  } catch (error) {
    console.error('Error updating query status:', error);
    res.status(500).json({ message: 'Error updating query' });
  }
};

// Respond to query (for managers)
export const respondToQuery = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { response } = req.body;
    const managerId = req.manager?.userId; // Access userId from req.manager

    if (!managerId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const query = await Query.findByIdAndUpdate(
      id,
      {
        managerResponse: response,
        respondedAt: new Date(),
        respondedBy: managerId,
        status: 'in-progress'
      },
      { new: true }
    ).populate('userId', 'fullName email');

    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    res.json(query);
  } catch (error) {
    console.error('Error responding to query:', error);
    res.status(500).json({ message: 'Error responding to query' });
  }
};