const GOOGLE_AI_API_KEY = 'AIzaSyAfe10byntnxuSPORc1JlJyB_pZeS4HNxo'; // Replace with your API key

const analyzeImageWithOpenRouter = async (base64Image) => {
  try {
    console.log('Starting API request...');
    
    // Extract MIME type and pure base64 data
    const match = base64Image.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!match) {
      throw new Error('Invalid image data format.');
    }

    const mimeType = match[1];
    const base64Data = match[2];

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: 'Analyze this food image and return ONLY a JSON object in this format: {"meal_name": "name", "calories": number, "protein": number, "carbs": number, "fats": number}. Do not include any other text. Return info for all items in the image meaning if there are 4 corn dogs in the image, the JSON should contain the total calories, protein, carbs, and fats for all 4 corn dogs. If no food in the image, return a message saying No Food in Image.'
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ]
    };

    console.log('Sending request to Google AI...');
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    );

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log('Raw API response:', data);

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from API');
    }

    const text = data.candidates[0].content.parts[0].text;
    
    // Check for "No Food in Image" response first
    if (text.includes('No Food in Image')) {
      return {
        choices: [{
          message: {
            content: 'No Food in Image'
          }
        }]
      };
    }
    
    // Try to parse the entire response first
    try {
      const parsedData = JSON.parse(text);
      console.log('Parsed response:', parsedData);
      return {
        choices: [{
          message: {
            content: parsedData
          }
        }]
      };
    } catch (parseError) {
      // If full parse fails, try to extract JSON from text
      const jsonMatch = text.match(/\{.*\}/s);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }
      const parsedData = JSON.parse(jsonMatch[0]);
      console.log('Parsed response from text:', parsedData);
      return {
        choices: [{
          message: {
            content: parsedData
          }
        }]
      };
    }

  } catch (error) {
    console.error('API call error:', error);
    console.error('Error stack:', error.stack);
    throw new Error(`Failed to analyze image: ${error.message}`);
  }
};

export default {
  analyzeImageWithOpenRouter
};
