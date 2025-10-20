import { StyleSheet, Text, TouchableOpacity } from 'react-native';

const Button = () => {
  return (
    <TouchableOpacity style={styles.container}>
      <Text>Button</Text>
    </TouchableOpacity>
  );
};

export default Button;

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
});
