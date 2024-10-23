// toggleAvatar.ts
export const toggleAvatar = (
  setSelectedAvatar: React.Dispatch<React.SetStateAction<string>>,
  setElevenlabsVoiceId: React.Dispatch<React.SetStateAction<string>>
) => {
  setSelectedAvatar(prevAvatar => {
    // アバター1とアバター2を切り替える
    const newAvatar = prevAvatar === 'avatar1' ? 'avatar2' : 'avatar1';
    // アバターに応じてボイスIDを切り替える
    setElevenlabsVoiceId(newAvatar === 'avatar1' ? '8EkOjt4xTPGMclNlh1pk' : 'j210dv0vWm7fCknyQpbA');
    return newAvatar;
  });
};