// Assuming sendAsAvatars is part of a module that exports it
const { sendAsAvatars, processAction, sendAsAvatar, sendAsAvatarsYML } = require('./avatarModule');
const { parseYaml } = require('js-yaml');

jest.mock('js-yaml', () => ({
  parseYaml: jest.fn()
}));

describe('sendAsAvatars', () => {
  // Mock avatars and options properties
  const avatars = {
    move: jest.fn()
  };
  const options = {
    yml: false
  };

  const setup = () => {
    const instance = {
      avatars,
      options,
      processAction: jest.fn(() => Promise.resolve()),
      sendAsAvatar: jest.fn(() => Promise.resolve()),
      sendAsAvatarsYML: jest.fn(() => Promise.resolve())
    };
    return instance;
  };

  beforeEach(() => {
    jest.clearAllMocks();  // Clear mocks in between tests
  });

  it('should parse valid YAML and process actions', async () => {
    const instance = setup();
    const output = "---\nfrom: userA\nin: room1\nmessage: Hello";
    parseYaml.mockReturnValue({ from: 'userA', in: 'room1', message: 'Hello' });

    await sendAsAvatars.call(instance, output, false);

    expect(parseYaml).toHaveBeenCalledWith("---\nfrom: userA\nin: room1\nmessage: Hello");
    expect(instance.processAction).toHaveBeenCalledWith({ from: 'userA', in: 'room1', message: 'Hello' }, false);
  });

  it('should handle invalid YAML gracefully', async () => {
    const instance = setup();
    const output = "---\nfrom userA\nin: room1\nmessage: Hello"; // Missing colon after "from"
    parseYaml.mockImplementation(() => {
      throw new Error('Invalid YAML');
    });

    await sendAsAvatars.call(instance, output, false);

    expect(parseYaml).toHaveBeenCalledWith("---\nfrom userA\nin: room1\nmessage: Hello");
    expect(instance.processAction).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it('should handle output with no actions', async () => {
    const instance = setup();
    const output = "---\ncomment: just a comment";
    parseYaml.mockReturnValue({ comment: 'just a comment' });

    await sendAsAvatars.call(instance, output, false);

    expect(parseYaml).toHaveBeenCalledWith("---\ncomment: just a comment");
    expect(instance.processAction).not.toHaveBeenCalled();
  });
});
