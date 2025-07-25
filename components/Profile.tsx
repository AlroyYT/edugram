// pages/profile.tsx
import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { MongoClient, ObjectId } from 'mongodb';
import Image from 'next/image';

interface User {
  _id: string;
  name: string;
  email: string;
  image: string;
  featureCounters: {
    BlindAssistance: number;
    DeafAssistance: number;
    AutismSupport: number;
    PersonalizedLearning: number;
  };
}

interface ProfileProps {
  user: User | null;
  error?: string;
}

export default function Profile({ user, error }: ProfileProps) {
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">User Not Found</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user profile...</p>
        </div>
      </div>
    );
  }

  const totalFeatureUsage = Object.values(user.featureCounters).reduce((sum, count) => sum + count, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-12 text-white">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <Image
                  src={user.image}
                  alt={user.name}
                  width={120}
                  height={120}
                  className="rounded-full border-4 border-white shadow-lg"
                />
                <div className="absolute -bottom-2 -right-2 bg-green-500 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">{user.name}</h1>
                <p className="text-blue-100 text-lg flex items-center">
                  <span className="mr-2">📧</span>
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
                <span className="mr-3">📊</span>
                Feature Usage Summary
              </h2>
              
              {/* Feature Counters Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {Object.entries(user.featureCounters).map(([feature, count]) => {
                  const icons = {
                    BlindAssistance: '👁️',
                    DeafAssistance: '👂',
                    AutismSupport: '🧩',
                    PersonalizedLearning: '🎓'
                  };
                  
                  return (
                    <div key={feature} className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl mb-1">{icons[feature as keyof typeof icons]}</div>
                          <p className="text-sm text-gray-600 font-medium">
                            {feature.replace(/([A-Z])/g, ' $1').trim()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-800">{count}</div>
                          <div className="text-xs text-gray-500">uses</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Usage Card */}
              <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Total Feature Usage</h3>
                    <p className="text-green-100">Across all accessibility features</p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold">{totalFeatureUsage}</div>
                    <div className="text-green-100">total uses</div>
                  </div>
                </div>
              </div>
            </div>

            {/* User Stats */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">User ID</span>
                  <span className="font-mono text-sm bg-gray-100 px-3 py-1 rounded">{user._id}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Most Used Feature</span>
                  <span className="font-medium text-gray-800">
                    {Object.entries(user.featureCounters).reduce((a, b) => 
                      user.featureCounters[a[0] as keyof typeof user.featureCounters] > 
                      user.featureCounters[b[0] as keyof typeof user.featureCounters] ? a : b
                    )[0].replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { userId } = context.query;
  
  // If no userId provided, try to get the first user (for demo purposes)
  // In production, you'd get this from session/auth
  
  try {
    const client = new MongoClient(process.env.MONGODB_URI as string);
    await client.connect();
    
    const db = client.db('test');
    const collection = db.collection('users');
    
    let user;
    
    if (userId && typeof userId === 'string') {
      // Try to find user by ID if provided
      user = await collection.findOne({ _id: new ObjectId(userId) });
    } else {
      // Get first user for demo (remove this in production)
      user = await collection.findOne({});
    }
    
    await client.close();
    
    if (!user) {
      return {
        props: {
          user: null,
          error: 'User not found in database'
        }
      };
    }
    
    // Convert ObjectId to string for serialization
    const serializedUser = {
      ...user,
      _id: user._id.toString()
    };
    
    return {
      props: {
        user: serializedUser
      }
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      props: {
        user: null,
        error: 'Failed to connect to database'
      }
    };
  }
};